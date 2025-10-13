import { Header } from './header'
import { Navigation } from './navigation'

interface MainLayoutProps {
    children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
    return (
        <div className="min-h-screen bg-white dark:bg-gray-800 pb-20 md:pb-16">
            <Header />
            <main>
                {/* Mobile-first responsive container */}
                <div className="px-4 py-4 sm:px-6 md:px-8 md:max-w-4xl md:mx-auto">
                    {children}
                </div>
            </main>
            <Navigation />
        </div>
    )
}
