'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error | null;
    errorInfo?: ErrorInfo | null;
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
            error
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        if (error && typeof error === 'object') {
            console.error('ErrorBoundary caught an error:', {
                name: error.name,
                message: error.message,
                stack: error.stack,
                info: errorInfo
            });
        } else {
            console.error('ErrorBoundary caught an unknown error type:', error);
        }

        this.setState({
            error,
            errorInfo
        });
    }

    componentDidMount() {
        if (typeof window !== 'undefined') {
            window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
        }
    }

    componentWillUnmount() {
        if (typeof window !== 'undefined') {
            window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
        }
    }

    handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        const error = event.reason instanceof Error 
            ? event.reason 
            : new Error(String(event.reason));

        this.setState({
            hasError: true,
            error
        });
    };

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="p-4 text-center">
                    <h2 className="text-red-500 font-bold mb-2">Something went wrong</h2>
                    <p className="text-gray-600 mb-4">
                        {this.state.error?.message || 'An unexpected error occurred'}
                    </p>
                    {this.state.error?.stack && (
                        <pre className="text-left text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40 mb-4">
                            {this.state.error.stack}
                        </pre>
                    )}
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
} 