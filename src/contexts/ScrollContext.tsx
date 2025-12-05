import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ScrollContextType {
  scrollY: number;
  contentHeight: number;
  visibleHeight: number;
  setScrollPosition: (scrollY: number, contentHeight: number, visibleHeight: number) => void;
}

const ScrollContext = createContext<ScrollContextType>({
  scrollY: 0,
  contentHeight: 0,
  visibleHeight: 0,
  setScrollPosition: () => {},
});

export const useScroll = () => useContext(ScrollContext);

export const ScrollProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [scrollY, setScrollY] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [visibleHeight, setVisibleHeight] = useState(0);

  const setScrollPosition = (y: number, content: number, visible: number) => {
    setScrollY(y);
    setContentHeight(content);
    setVisibleHeight(visible);
  };

  return (
    <ScrollContext.Provider value={{ scrollY, contentHeight, visibleHeight, setScrollPosition }}>
      {children}
    </ScrollContext.Provider>
  );
};
