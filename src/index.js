import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: Infinity,            // if query is cached, do not fetch again on next query
            cacheTime: Infinity,            // we don't want caches to be garbage collected at all in our case
            refetchOnWindowFocus: false,    // this is true by default for some reason. We don't want that
            retry: false,                   // keep retries false for now
        },
    },
})

ReactDOM.render(
    <React.StrictMode>
        <QueryClientProvider client={ queryClient }>
            <App />
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    </React.StrictMode>,
    document.getElementById('dashboard')
);