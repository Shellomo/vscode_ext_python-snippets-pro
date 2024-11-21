export interface Snippet {
    prefix: string;
    body: string[];
    description: string;
}

export interface SnippetDictionary {
    [key: string]: Snippet;
}