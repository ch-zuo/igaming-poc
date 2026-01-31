import React from 'react';
import LogEntry from './LogEntry';

function LogSection({ title, logs, type }) {
    return (
        <div className={`log-section ${type}-section`}>
            <div className="log-section-header">
                <h4>{title}</h4>
                <small style={{ opacity: 0.6 }}>{logs.length} events</small>
            </div>
            <div className="log-list">
                {logs.length > 0 ? (
                    logs.map((log) => (
                        <LogEntry key={log.id} log={log} type={type} />
                    ))
                ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        Waiting for activity...
                    </div>
                )}
            </div>
        </div>
    );
}

export default LogSection;
