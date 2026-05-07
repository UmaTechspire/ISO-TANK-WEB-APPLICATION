// Assuming this is the content of your TankFormTabs.jsx
import React from 'react';

export default function TankFormTabs({ activeTab, setActiveTab, isNewFlow }) {
    const visibleTabs = [
        { key: 'tank', label: 'Tank' },
        { key: 'certificate', label: 'Certificate' },
        { key: 'drawing', label: 'P&ID Drawings' },
        { key: 'valve', label: 'Valve' },
        { key: 'gauge', label: 'Gauge' },
        { key: 'tank_frame', label: 'Tank Frame' },
    ];

    return (
        <div className="flex w-full">
            {visibleTabs.map((tab) => (
                <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`
                        px-4 py-2 text-sm font-semibold transition-colors duration-150 relative
                        ${activeTab === tab.key
                            ? 'bg-[#5D7077] text-white rounded-t-lg'
                            : 'text-gray-600 hover:text-gray-900'
                        }
                    `}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}