import * as React from "react"
import { Search, Loader2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface SelectionSheetProps<T> {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    trigger?: React.ReactNode
    searchPlaceholder?: string
    searchValue: string
    onSearchChange: (value: string) => void
    items: T[]
    renderItem: (item: T) => React.ReactNode
    isLoading?: boolean
    onLoadMore?: () => void
    hasMore?: boolean
    isLoadingMore?: boolean
}

export function SelectionSheet<T>({
    open,
    onOpenChange,
    title,
    trigger,
    searchPlaceholder = "Search...",
    searchValue,
    onSearchChange,
    items,
    renderItem,
    isLoading,
    onLoadMore,
    hasMore,
    isLoadingMore
}: SelectionSheetProps<T>) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
            <SheetContent className="w-full sm:max-w-md p-0 flex flex-col h-full bg-white border-l shadow-xl" side="right">
                {/* Header */}
                <div className="flex items-center gap-2 p-4 border-b">
                    <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="mr-2">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <SheetTitle className="text-lg font-semibold">{title}</SheetTitle>
                </div>

                {/* Search */}
                <div className="p-4 border-b bg-gray-50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            value={searchValue}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="pl-9 bg-white border-gray-200 focus-visible:ring-green-600"
                        />
                    </div>
                </div>

                {/* List */}
                <ScrollArea className="flex-1 bg-white">
                    {isLoading && items.length === 0 ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex items-center justify-center py-8 text-gray-500">
                            No results found.
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {items.map((item, index) => (
                                <div key={index} className="border-b border-gray-50 last:border-0">
                                    {renderItem(item)}
                                </div>
                            ))}
                            {hasMore && (
                                <div className="p-4 flex justify-center border-t border-gray-100">
                                    <Button
                                        variant="ghost"
                                        onClick={onLoadMore}
                                        disabled={isLoadingMore}
                                        className="text-sm text-blue-600 hover:text-blue-700"
                                    >
                                        {isLoadingMore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        {isLoadingMore ? "Loading..." : "Load More"}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}
