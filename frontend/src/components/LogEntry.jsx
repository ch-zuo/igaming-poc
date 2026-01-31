import React, { useState } from 'react';

function LogEntry({ log, type }) {
    const [expanded, setExpanded] = useState(false);

    const isSuccess = log.status >= 200 && log.status < 300;
    const neonClass = type === 'inbound' ? 'inbound-neon' : 'outbound-neon';

    return (
        <div className={`log-entry ${neonClass}`}>
            <div className="log-entry-header" onClick={() => setExpanded(!expanded)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <span className="log-entry-method">{log.method}</span>
                    <span style={{ color: 'var(--text-main)', opacity: 0.8, fontSize: '0.75rem', wordBreak: 'break-all' }}>
                        {log.endpoint}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
                    <span className={`log-entry-status ${isSuccess ? 'status-success' : 'status-error'}`}>
                        {log.status}
                    </span>
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                        {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </small>
                </div>
            </div>
            {expanded && (
                <div className="log-payload">
                    {log.payload.request && Object.keys(log.payload.request).length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                            <div style={{ color: 'var(--accent-blue)', fontWeight: 600, marginBottom: '4px', fontSize: '0.7rem', textTransform: 'uppercase' }}>Request Body</div>
                            <pre style={{ margin: 0 }}>{JSON.stringify(log.payload.request, null, 2)}</pre>
                        </div>
                    )}
                    {log.payload.response && Object.keys(log.payload.response).length > 0 && (
                        <div>
                            <div style={{ color: 'var(--primary)', fontWeight: 600, marginBottom: '4px', fontSize: '0.7rem', textTransform: 'uppercase' }}>Response Body</div>
                            <pre style={{ margin: 0 }}>{JSON.stringify(log.payload.response, null, 2)}</pre>
                        </div>
                    )}
                    {(!log.payload.request || Object.keys(log.payload.request).length === 0) &&
                        (!log.payload.response || Object.keys(log.payload.response).length === 0) && (
                            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No payload data available</div>
                        )}
                </div>
            )}
        </div>
    );
}

export default LogEntry;
