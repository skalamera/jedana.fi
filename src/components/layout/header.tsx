import { useAuthStore } from '@/stores/auth-store'
import Link from 'next/link'
import { LogOut, Settings } from 'lucide-react'
import { Cairo_Play } from 'next/font/google'
import { useRouter } from 'next/navigation'

const cairoPlay = Cairo_Play({ subsets: ['latin'], weight: ['700'] })

export function Header() {
    const { user, signOut } = useAuthStore()
    const router = useRouter()

    return (
        <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
            <div className="px-4 sm:px-6 md:px-8">
                <div className="flex justify-between items-center h-14 md:h-16">
                    <div className="flex items-center">
                        <h1 className={`text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate ${cairoPlay.className}`}>
                            jedana.fi
                        </h1>
                    </div>

                    <div className="flex items-center space-x-2 md:space-x-4">
                        {user ? (
                            <div className="flex items-center space-x-2">
                                <span className="text-xs md:text-sm text-gray-600 dark:text-gray-300 hidden sm:block truncate max-w-24 md:max-w-none">
                                    {user.email}
                                </span>
                                <Link
                                    href="/settings"
                                    className="text-xs md:text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 md:px-3 py-1.5 md:py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
                                    aria-label="Settings"
                                    title="Settings"
                                >
                                    <Settings className="w-4 h-4" />
                                </Link>
                                <button
                                    onClick={async () => { await signOut(); router.push('/auth') }}
                                    className="text-xs md:text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 md:px-3 py-1.5 md:py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
                                    aria-label="Sign Out"
                                    title="Sign Out"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                                <span className="md:hidden">Sign in</span>
                                <span className="hidden md:inline">Please sign in</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}
