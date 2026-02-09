import React from 'react';
import styled from 'styled-components';

const SEOContentWrapper = styled.div`
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
  
  /* Альтернативный вариант: видимый контент в футере */
  /* 
  margin-top: 60px;
  padding: 40px 20px;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
  color: rgba(200, 200, 200, 0.7);
  font-size: 14px;
  line-height: 1.6;
  
  h1 {
    font-size: 24px;
    color: rgba(240, 240, 240, 0.9);
    margin-bottom: 16px;
  }
  
  h2 {
    font-size: 20px;
    color: rgba(220, 220, 220, 0.8);
    margin-top: 24px;
    margin-bottom: 12px;
  }
  
  p {
    margin-bottom: 12px;
  }
  
  ul {
    margin-left: 20px;
    margin-bottom: 12px;
  }
  
  li {
    margin-bottom: 8px;
  }
  */
`;

interface SEOContentProps {
  children: React.ReactNode;
}

/**
 * Компонент для SEO-контента
 * По умолчанию скрыт (position: absolute; left: -9999px)
 * Можно сделать видимым, раскомментировав альтернативные стили
 */
export const SEOContent: React.FC<SEOContentProps> = ({ children }) => {
  return <SEOContentWrapper>{children}</SEOContentWrapper>;
};
