'use client'

import { useState, useEffect, useRef } from 'react'
import { usePortfolioStore } from '@/stores/portfolio-store'
import { ChevronDown, Plus, Settings, Trash2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface Portfolio {
    id: string
    name: string
    description?: string
    is_default: boolean
    created_at: string
    updated_at: string
}

export function PortfolioSelector() {
    const {
        portfolios,
        selectedPortfolioId,
        isLoadingPortfolios,
        setSelectedPortfolio,
        fetchPortfolios,
        createPortfolio,
        deletePortfolio,
        setDefaultPortfolio
    } = usePortfolioStore()

    const [showCreateForm, setShowCreateForm] = useState(false)
    const [newPortfolioName, setNewPortfolioName] = useState('')
    const [newPortfolioDescription, setNewPortfolioDescription] = useState('')
    const [isCreating, setIsCreating] = useState(false)
    const formRef = useRef<HTMLDivElement>(null)

    const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId)

    useEffect(() => {
        fetchPortfolios()
    }, [fetchPortfolios])

    const handleCreatePortfolio = async () => {
        if (!newPortfolioName.trim()) return

        setIsCreating(true)
        try {
            await createPortfolio(newPortfolioName.trim(), newPortfolioDescription.trim())
            setNewPortfolioName('')
            setNewPortfolioDescription('')
            setShowCreateForm(false)
        } catch (error) {
            console.error('Failed to create portfolio:', error)
        } finally {
            setIsCreating(false)
        }
    }

    const handleCancelCreate = () => {
        setNewPortfolioName('')
        setNewPortfolioDescription('')
        setShowCreateForm(false)
    }

    const handleDeletePortfolio = async (portfolioId: string) => {
        if (window.confirm('Are you sure you want to delete this portfolio? This action cannot be undone.')) {
            try {
                await deletePortfolio(portfolioId)
            } catch (error) {
                console.error('Failed to delete portfolio:', error)
            }
        }
    }

    const handleSetDefault = async (portfolioId: string) => {
        try {
            await setDefaultPortfolio(portfolioId)
        } catch (error) {
            console.error('Failed to set default portfolio:', error)
        }
    }

    if (isLoadingPortfolios) {
        return (
            <div className="flex items-center space-x-2">
                <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
        )
    }

    return (
        <div className="flex items-center space-x-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="min-w-[200px] justify-between">
                        <span className="truncate">
                            {selectedPortfolio?.name || 'Select Portfolio'}
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    {showCreateForm ? (
                        <div ref={formRef} className="p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-gray-900 dark:text-white">Create New Portfolio</h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCancelCreate}
                                    className="h-6 w-6 p-0"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Portfolio Name
                                    </label>
                                    <Input
                                        value={newPortfolioName}
                                        onChange={(e) => setNewPortfolioName(e.target.value)}
                                        placeholder="e.g., Tech Stocks, Crypto, Retirement"
                                        maxLength={50}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Description (Optional)
                                    </label>
                                    <Textarea
                                        value={newPortfolioDescription}
                                        onChange={(e) => setNewPortfolioDescription(e.target.value)}
                                        placeholder="Describe the purpose or strategy of this portfolio"
                                        maxLength={200}
                                        rows={2}
                                        className="w-full resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button
                                    onClick={handleCreatePortfolio}
                                    disabled={isCreating || !newPortfolioName.trim()}
                                    className="flex-1"
                                >
                                    {isCreating ? 'Creating...' : 'Create'}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleCancelCreate}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {portfolios.map((portfolio) => (
                                <DropdownMenuItem
                                    key={portfolio.id}
                                    onClick={() => setSelectedPortfolio(portfolio.id)}
                                    className={`flex items-center justify-between text-gray-900 dark:text-gray-100 ${selectedPortfolioId === portfolio.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium truncate">{portfolio.name}</span>
                                            {portfolio.is_default && (
                                                <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                                                    Default
                                                </span>
                                            )}
                                        </div>
                                        {portfolio.description && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                {portfolio.description}
                                            </div>
                                        )}
                                    </div>
                                </DropdownMenuItem>
                            ))}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                                onSelect={(e) => {
                                    e.preventDefault()
                                    setShowCreateForm(true)
                                }}
                                className="text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-slate-700"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Create New Portfolio
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
