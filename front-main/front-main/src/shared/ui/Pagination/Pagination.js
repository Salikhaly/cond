import React from 'react';
import styles from './Pagination.module.css'
export const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    // Функция для генерации массива чисел от start до end
    const range = (start, end) =>
        Array.from({ length: end - start + 1 }, (_, i) => start + i);

    // Если totalPages <= 7, показываем все страницы
    if (totalPages <= 7) {
        const pageButtons = range(1, totalPages).map(p => (
            <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`
                ${styles.Pagination__btn}
                ${currentPage === p && styles['Pagination__btn--active']}
            `}
            >
                {p}
            </button>
        ));
        return <div className="pagination">{pageButtons}</div>;
    }

    // Иначе формируем пагинацию с ...
    const pages = [];
    // Показываем первые 7 страниц и ...
    if (currentPage <= 4) {
        pages.push(...range(1, 7), '...', totalPages);
    } else if (currentPage >= totalPages - 3) {
        // Показываем последние 7 страниц и ...
        pages.push(1, '...', ...range(totalPages - 6, totalPages));
    } else {
        // Показываем страницы вокруг текущей и ...
        pages.push(1, '...', ...range(currentPage - 2, currentPage + 2), '...', totalPages);
    }

    function handlePage(p) {
        onPageChange(p)
    }

    const pageButtons = pages.map(p => (
        <button
            key={p}
            onClick={() => handlePage(p)}
            className={`
                ${styles.Pagination__btn}
                ${currentPage === p && styles['Pagination__btn--active']}
            `}
        >
            {p}
        </button>
    ));

    return (
        <div className={styles.Pagination}>
            {currentPage !== 1 && <button className={`${styles.Pagination__btn} ${styles.Pagination__btn__nav}`} onClick={() => handlePage(currentPage - 1)} disabled={currentPage === 1}>
                Back
            </button>}

            {pageButtons}

            {currentPage !== totalPages && <button className={`${styles.Pagination__btn} ${styles.Pagination__btn__nav}`} onClick={() => handlePage(currentPage + 1)} disabled={currentPage === totalPages}>
                Next
            </button>}
        </div>
    );
};

