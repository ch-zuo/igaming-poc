import React, { useState } from 'react';

function LogEntry({ log, type }) {
    const [expanded, setExpanded] = useState(false);

    const isSuccess = log.status >= 200 && log.status < 300;
    const neonClass = type === 'inbound' ? 'inbound-neon' : 'outbound-neon';

    return (
        <div className={`log-entry ${neonClass}`}>
            <div className="log-entry-header" onClick={() => setExpanded(!expanded)}>
                <div>
                    <span className="log-entry-method">{log.method}</span>
                    <span style={{ color: 'var(--text-main)', opacity: 0.8 }}>{log.endpoint}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`log-entry-status ${isSuccess ? 'status-success' : 'status-error'}`}>
                        {log.status}
                    </span>
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                        {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </small>
                </div>
            </div>
            {expanded && (
                <div className="log-payload">
                    <pre>{JSON.stringify(log.payload, null, 2)}</pre>
                </div>
            )}
        </div>
    );
}

export default LogEntry;
