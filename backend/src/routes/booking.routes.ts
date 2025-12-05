import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

/**
 * POST /api/bookings
 * Create a new booking with all parameters including add-ons
 */
router.post('/', async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const {
      companyId,
      vehicleId,
      customerId,
      startDate,
      endDate,
      totalDays,
      monthlyPeriods,
      remainingDays,
      dailyRate,
      monthlyRate,
      totalAmount,
      notes,
      addOns // Array of add-ons: [{ id, name, dailyRate, quantity, totalAmount }]
    } = req.body;

    // Validate required fields
    if (!companyId || !vehicleId || !customerId || !startDate || !endDate || !totalAmount) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['companyId', 'vehicleId', 'customerId', 'startDate', 'endDate', 'totalAmount']
      });
    }

    await client.query('BEGIN');

    // Generate booking number
    const bookingNumber = `BK-${Date.now()}`;

    // Insert booking
    const bookingResult = await client.query(`
      INSERT INTO bookings (
        "companyId",
        "vehicleId",
        "customerId",
        "bookingNumber",
        "startDate",
        "endDate",
        "totalDays",
        "monthlyPeriods",
        "remainingDays",
        "dailyRate",
        "monthlyRate",
        "totalAmount",
        status,
        notes,
        "createdAt",
        "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      RETURNING *
    `, [
      companyId,
      vehicleId,
      customerId,
      bookingNumber,
      startDate,
      endDate,
      totalDays || 0,
      monthlyPeriods || 0,
      remainingDays || 0,
      dailyRate || 0,
      monthlyRate || 0,
      totalAmount,
      'PENDING',
      notes || null
    ]);

    const booking = bookingResult.rows[0];

    // Insert add-ons if provided
    if (addOns && Array.isArray(addOns) && addOns.length > 0) {
      for (const addon of addOns) {
        await client.query(`
          INSERT INTO booking_addons (
            booking_id,
            addon_name,
            daily_rate,
            quantity,
            total_amount
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          booking.id,
          addon.name,
          addon.dailyRate,
          addon.quantity || 1,
          addon.totalAmount
        ]);
      }
    }

    await client.query('COMMIT');

    // Fetch complete booking with add-ons
    const completeBooking = await client.query(`
      SELECT
        b.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ba.id,
              'name', ba.addon_name,
              'dailyRate', ba.daily_rate,
              'quantity', ba.quantity,
              'totalAmount', ba.total_amount
            )
          ) FILTER (WHERE ba.id IS NOT NULL),
          '[]'
        ) as addons
      FROM bookings b
      LEFT JOIN booking_addons ba ON ba.booking_id = b.id::uuid
      WHERE b.id = $1
      GROUP BY b.id
    `, [booking.id]);

    res.status(201).json({
      success: true,
      booking: completeBooking.rows[0],
      message: 'Booking created successfully'
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Booking creation error:', error);
    res.status(500).json({
      error: 'Failed to create booking',
      details: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/bookings/count
 * Get total bookings count
 */
router.get('/count', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    let query = 'SELECT COUNT(*) as total FROM bookings';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      total: parseInt(result.rows[0].total),
      status: status || 'all'
    });

  } catch (error: any) {
    console.error('Count bookings error:', error);
    res.status(500).json({
      error: 'Failed to count bookings',
      details: error.message
    });
  }
});

/**
 * GET /api/bookings
 * Get all bookings with pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT
        b.*,
        u.email as customer_email,
        v.make || ' ' || v.model as vehicle_name,
        c.name as company_name,
        COALESCE(
          json_agg(
            json_build_object(
              'name', ba.addon_name,
              'totalAmount', ba.total_amount
            )
          ) FILTER (WHERE ba.id IS NOT NULL),
          '[]'
        ) as addons
      FROM bookings b
      LEFT JOIN users u ON u.id = b."customerId"::uuid
      LEFT JOIN vehicles v ON v.id = b."vehicleId"::uuid
      LEFT JOIN companies c ON c.id = b."companyId"::uuid
      LEFT JOIN booking_addons ba ON ba.booking_id = b.id::uuid
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` WHERE b.status = $${paramCount}`;
      params.push(status);
    }

    query += ` GROUP BY b.id, u.email, v.make, v.model, c.name`;
    query += ` ORDER BY b."createdAt" DESC`;

    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(Number(limit));

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM bookings';
    const countParams: any[] = [];

    if (status) {
      countQuery += ' WHERE status = $1';
      countParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      bookings: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / Number(limit))
      }
    });

  } catch (error: any) {
    console.error('Fetch bookings error:', error);
    res.status(500).json({
      error: 'Failed to fetch bookings',
      details: error.message
    });
  }
});

/**
 * GET /api/bookings/:id
 * Get booking by ID with all details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        b.*,
        u.email as customer_email,
        u."firstName" as customer_first_name,
        u."lastName" as customer_last_name,
        v.make,
        v.model,
        v.year,
        v.color,
        c.name as company_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ba.id,
              'name', ba.addon_name,
              'dailyRate', ba.daily_rate,
              'quantity', ba.quantity,
              'totalAmount', ba.total_amount
            )
          ) FILTER (WHERE ba.id IS NOT NULL),
          '[]'
        ) as addons
      FROM bookings b
      LEFT JOIN users u ON u.id = b."customerId"::uuid
      LEFT JOIN vehicles v ON v.id = b."vehicleId"::uuid
      LEFT JOIN companies c ON c.id = b."companyId"::uuid
      LEFT JOIN booking_addons ba ON ba.booking_id = b.id::uuid
      WHERE b.id = $1
      GROUP BY b.id, u.email, u."firstName", u."lastName", v.make, v.model, v.year, v.color, c.name
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    res.json({
      success: true,
      booking: result.rows[0]
    });

  } catch (error: any) {
    console.error('Fetch booking error:', error);
    res.status(500).json({
      error: 'Failed to fetch booking',
      details: error.message
    });
  }
});

/**
 * PATCH /api/bookings/:id/status
 * Update booking status
 */
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        validStatuses
      });
    }

    const result = await pool.query(`
      UPDATE bookings
      SET status = $1, "updatedAt" = NOW()
      WHERE id = $2
      RETURNING *
    `, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    res.json({
      success: true,
      booking: result.rows[0],
      message: `Booking status updated to ${status}`
    });

  } catch (error: any) {
    console.error('Update booking status error:', error);
    res.status(500).json({
      error: 'Failed to update booking status',
      details: error.message
    });
  }
});

export default router;
