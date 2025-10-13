'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Settings, PlusCircle, Home, Brain, Bookmark } from 'lucide-react'

const navigation = [
    { name: 'Portfolio', href: '/', icon: LayoutDashboard, mobileLabel: 'Portfolio' },
    { name: 'AI Screener', href: '/ai-screener', icon: Brain, mobileLabel: 'AI' },
    { name: 'Analysis', href: '/analysis', icon: Bookmark, mobileLabel: 'Saved' },
    { name: 'Add Asset', href: '/add-asset', icon: PlusCircle, mobileLabel: 'Add' },
    // Settings moved to top header; keep mobile access optionally by uncommenting below
    // { name: 'Settings', href: '/settings', icon: Settings, mobileLabel: 'Settings' },
]

export function Navigation() {
    const pathname = usePathname()

    return (
        <>
            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 safe-area-pb z-40">
                <div className="grid grid-cols-4 h-16">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex flex-col items-center justify-center space-y-1 transition-colors ${isActive
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? 'fill-current' : ''}`} />
                                <span className="text-xs font-medium">{item.mobileLabel}</span>
                            </Link>
                        )
                    })}
                </div>
            </nav>

            {/* Desktop Bottom Navigation (fixed) */}
            <nav className="hidden md:block fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-40">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="grid grid-cols-4 h-14">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex items-center justify-center gap-2 text-sm font-medium transition-colors ${isActive
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200'
                                        }`}
                                >
                                    <item.icon className="w-4 h-4" />
                                    <span>{item.name}</span>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </nav>
        </>
    )
}
