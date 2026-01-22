import React, { Component, ErrorInfo, ReactNode } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';

const ErrorContainer = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(to bottom right, rgba(8, 8, 18, 1), rgba(8, 8, 18, 0.95));
  color: ${theme.colors.text.primary};
  padding: ${theme.spacing.xl};
`;

const ErrorTitle = styled.h1`
  font-size: ${theme.fontSize.xxl};
  margin-bottom: ${theme.spacing.lg};
  color: rgba(255, 59, 48, 1);
`;

const ErrorMessage = styled.p`
  font-size: ${theme.fontSize.base};
  margin-bottom: ${theme.spacing.md};
  color: ${theme.colors.text.secondary};
  text-align: center;
  max-width: 600px;
`;

const ErrorDetails = styled.pre`
  background: rgba(40, 40, 40, 0.8);
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.text.secondary};
  overflow-x: auto;
  max-width: 800px;
  margin-bottom: ${theme.spacing.lg};
`;

const RetryButton = styled.button`
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  background: rgba(80, 80, 80, 0.8);
  border: 1px solid rgba(150, 150, 150, 0.3);
  border-radius: ${theme.borderRadius.md};
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.base};
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(100, 100, 100, 0.9);
    border-color: rgba(150, 150, 150, 0.5);
  }
`;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    
    
    this.setState({
      error,
      errorInfo
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorContainer>
          <ErrorTitle>Произошла ошибка</ErrorTitle>
          <ErrorMessage>
            К сожалению, что-то пошло не так. Пожалуйста, попробуйте обновить страницу.
          </ErrorMessage>
          {this.state.error && (
            <ErrorDetails>
              {this.state.error.toString()}
              {this.state.errorInfo && (
                <>
                  {'\n\n'}
                  {this.state.errorInfo.componentStack}
                </>
              )}
            </ErrorDetails>
          )}
          <RetryButton onClick={this.handleRetry}>
            Попробовать снова
          </RetryButton>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

