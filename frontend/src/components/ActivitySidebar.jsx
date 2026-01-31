import React from 'react';
import LogSection from './LogSection';

function ActivitySidebar({ inboundLogs, outboundLogs }) {
    return (
        <aside className="activity-sidebar">
            <LogSection
                title="📥 Inbound Activity"
                logs={inboundLogs}
                type="inbound"
            />
            <LogSection
                title="📤 Outbound Activity"
                logs={outboundLogs}
                type="outbound"
            />
        </aside>
    );
}

export default ActivitySidebar;
