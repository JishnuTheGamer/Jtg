import React from 'react';
import { Terminal } from 'lucide-react';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
    return (
        <header className="max-w-7xl mx-auto px-5 md:px-8 pt-16 md:pt-20 pb-16">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="reveal active">
                    <p className="font-mono text-[11px] md:text-xs text-dim tracking-[0.25em] flex items-center gap-2 mb-6 uppercase">
                        <Terminal className="w-3.5 h-3.5" /> // JTG.CORE — {subtitle || title}
                    </p>
                    <h1 className="font-display font-bold leading-[0.85] tracking-tight text-5xl md:text-7xl uppercase text-white">
                        {title}
                    </h1>
                </div>
                {actions && (
                    <div className="flex items-center gap-3 reveal active" style={{ transitionDelay: '100ms' }}>
                        {actions}
                    </div>
                )}
            </div>
        </header>
    );
}
