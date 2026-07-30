export const readDocuments = new Set<'terms' | 'privacy'>();

export const markRead = (doc: 'terms' | 'privacy') => readDocuments.add(doc);

export const hasRead = (doc: 'terms' | 'privacy') => readDocuments.has(doc);

export const clearReadState = () => readDocuments.clear();
