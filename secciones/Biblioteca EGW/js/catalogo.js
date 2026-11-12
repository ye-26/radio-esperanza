export function createCatalog({ books, search, category = '', author = '', sort = 'title' }) {
    return books.filter(book => (!category || book.category === category) && (!author || book.author === author) && (!search || search.matches(book, search.query)))
        .sort((first, second) => String(first[sort === 'author' ? 'author' : 'title']).localeCompare(String(second[sort === 'author' ? 'author' : 'title']), 'es'));
}
