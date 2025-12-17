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

const SkeletonLoader = () => (
    <div className="flex flex-col space-y-3 p-4">
        {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center space-x-4">
                <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
                <div className="space-y-2 flex-1">
                    <div className="h-4 w-3/4 rounded bg-gray-200 animate-pulse" />
                    <div className="h-3 w-1/2 rounded bg-gray-200 animate-pulse" />
                </div>
            </div>
        ))}
    </div>
);

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

    // Infinite scroll observer
    const observerTarget = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoadingMore && onLoadMore) {
                    onLoadMore();
                }
            },
            { threshold: 1.0 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [observerTarget, hasMore, isLoadingMore, onLoadMore]);

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
                        <SkeletonLoader />
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

                            {/* Infinite Scroll Trigger & Loader */}
                            <div ref={observerTarget} className="h-10 flex items-center justify-center p-4">
                                {isLoadingMore && (
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                                        <span>Loading more...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}
