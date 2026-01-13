export interface Tag {
    id: string;
    text: string;
    color?: string;
}

export interface Bookmark {
    id: string;
    url: string;
    title: string;
    summary?: string;
    tags: Tag[];
    categoryId: string;
    createdAt: Date;
    reminderAt?: Date;
}

export interface Category {
    id: string;
    name: string;
    color: 'emerald' | 'violet' | 'amber' | 'rose' | 'sky';
    icon: string; // lucide icon name
}
