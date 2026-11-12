const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
const termsFor = (book) => [book.title, book.author, book.category, book.description, ...(book.keywords || []), ...(book.related || [])].join(' ');
export const createSearch = {
    matches(book, query) {
        const terms = normalize(termsFor(book));
        return normalize(query).split(/\s+/).filter(Boolean).every(term => terms.includes(term));
    },
    debounce(callback, delay = 180) {
        let timer;
        return (...args) => { clearTimeout(timer); timer = setTimeout(() => callback(...args), delay); };
    }
};
