import React from 'react';
import { Result, Button } from 'antd';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReload = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <Result
            status="error"
            title="Đã xảy ra lỗi"
            subTitle="Phiên đăng nhập có thể đã hết hạn hoặc ứng dụng gặp sự cố."
            extra={[
              <Button type="primary" key="login" onClick={this.handleReload}>
                Đăng nhập lại
              </Button>,
              <Button key="reload" onClick={() => window.location.reload()}>
                Tải lại trang
              </Button>,
            ]}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
