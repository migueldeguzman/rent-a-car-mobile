import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

interface CustomScrollbarProps {
  scrollY?: number;
  contentHeight?: number;
  visibleHeight?: number;
}

const CustomScrollbar: React.FC<CustomScrollbarProps> = ({ scrollY, contentHeight, visibleHeight }) => {
  const [thumbHeight, setThumbHeight] = useState(40);
  const [thumbTop, setThumbTop] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const startScrollTopRef = useRef(0);

  // Only render on web
  if (Platform.OS !== 'web') {
    return null;
  }

  useEffect(() => {
    const updateScrollbar = () => {
      if (typeof window === 'undefined') return;

      // Use props if provided (from ScrollView), otherwise use window scroll
      let scrollTop: number;
      let scrollHeight: number;
      let clientHeight: number;

      if (scrollY !== undefined && contentHeight !== undefined && visibleHeight !== undefined) {
        // ScrollView provided these values
        scrollTop = scrollY;
        scrollHeight = contentHeight;
        clientHeight = visibleHeight;
      } else {
        // Fall back to window scroll detection
        scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
        scrollHeight = Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.offsetHeight,
          document.body.clientHeight,
          document.documentElement.clientHeight
        );
        clientHeight = window.innerHeight || document.documentElement.clientHeight;
      }

      setIsVisible(true);

      // Calculate thumb size - ALWAYS cap at 15% maximum
      const scrollRatio = clientHeight / scrollHeight;
      const calculatedThumbHeight = clientHeight * scrollRatio;

      // Cap at 15% max, 60px minimum for usability
      const maxThumbHeight = clientHeight * 0.15; // 15% maximum
      const newThumbHeight = Math.max(
        Math.min(calculatedThumbHeight, maxThumbHeight),
        60
      );

      // Calculate thumb position proportional to scroll position
      const maxScrollTop = Math.max(scrollHeight - clientHeight, 0);
      const maxThumbTop = clientHeight - newThumbHeight;

      let newThumbTop = 0;
      if (maxScrollTop > 0) {
        const scrollPercentage = scrollTop / maxScrollTop;
        newThumbTop = scrollPercentage * maxThumbTop;
      }

      setThumbHeight(newThumbHeight);
      setThumbTop(newThumbTop);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaY = e.clientY - startYRef.current;
      const scrollHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
      const clientHeight = window.innerHeight || document.documentElement.clientHeight;
      const maxScrollTop = scrollHeight - clientHeight;
      const maxThumbTop = clientHeight - thumbHeight;

      // Convert thumb movement to scroll movement
      const scrollDelta = maxThumbTop > 0 ? (deltaY / maxThumbTop) * maxScrollTop : 0;
      const newScrollTop = Math.max(0, Math.min(maxScrollTop, startScrollTopRef.current + scrollDelta));

      window.scrollTo(0, newScrollTop);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    // Update on scroll and resize - listen to all possible scroll events
    window.addEventListener('scroll', updateScrollbar, { passive: true });
    document.addEventListener('scroll', updateScrollbar, { passive: true, capture: true });
    window.addEventListener('resize', updateScrollbar);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Listen to wheel events for immediate feedback
    document.addEventListener('wheel', updateScrollbar, { passive: true });
    document.addEventListener('touchmove', updateScrollbar, { passive: true });

    // Listen to scroll on all potentially scrollable elements (React Native ScrollViews)
    const scrollableElements = document.querySelectorAll('[data-focusable="true"]');
    scrollableElements.forEach(element => {
      element.addEventListener('scroll', updateScrollbar, { passive: true });
    });

    // Initial update with delay to allow content to render
    setTimeout(updateScrollbar, 100);
    setTimeout(updateScrollbar, 500);
    setTimeout(updateScrollbar, 1000);
    const interval = setInterval(updateScrollbar, 100); // Very frequent updates (10 times per second)

    // Force update when DOM changes
    const observer = new MutationObserver(updateScrollbar);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => {
      window.removeEventListener('scroll', updateScrollbar);
      document.removeEventListener('scroll', updateScrollbar);
      window.removeEventListener('resize', updateScrollbar);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      scrollableElements.forEach(element => {
        element.removeEventListener('scroll', updateScrollbar);
      });
      clearInterval(interval);
      observer.disconnect();
    };
  }, [isDragging, thumbHeight, scrollY, contentHeight, visibleHeight]);

  const handleMouseDown = (e: any) => {
    e.preventDefault();
    setIsDragging(true);
    startYRef.current = e.nativeEvent.clientY;
    startScrollTopRef.current = window.pageYOffset || document.documentElement.scrollTop || 0;
  };

  return (
    <View style={styles.scrollbarContainer}>
      <View
        style={[styles.scrollbarThumb, { height: thumbHeight, top: thumbTop }]}
        onMouseDown={handleMouseDown}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  scrollbarContainer: {
    position: 'fixed' as any,
    right: 0,
    top: 0,
    width: 16,
    height: '100vh' as any,
    backgroundColor: '#e0e0e0',
    zIndex: 999999,
    pointerEvents: 'none' as any,
  },
  scrollbarThumb: {
    position: 'absolute' as any,
    right: 0,
    width: 16,
    backgroundColor: '#2C5F2D',
    borderRadius: 8,
    cursor: 'pointer' as any,
    pointerEvents: 'auto' as any,
    minHeight: 40,
  },
});

export default CustomScrollbar;
