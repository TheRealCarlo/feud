'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { 
            hasError: false,
            error: undefined
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log the error
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    componentDidMount() {
        // Client-side only code
        if (typeof window !== 'undefined') {
            window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
        }
    }

    componentWillUnmount() {
        // Cleanup
        if (typeof window !== 'undefined') {
            window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
        }
    }

    handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        this.setState({
            hasError: true,
            error: event.reason instanceof Error ? event.reason : new Error(String(event.reason))
        });
    };

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="p-4 text-center">
                    <h2 className="text-red-500 font-bold mb-2">Something went wrong</h2>
                    <p className="text-gray-600">
                        {this.state.error?.message || 'An unexpected error occurred'}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
} 