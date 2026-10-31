import React, {useState} from "react";
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {Block, Input, Modal, Typography} from "../../../shared/ui";

export function OutcomeFilter({ filter={}, onFilterChange= f=>f, onClose= f=>f }) {
    const handleDateChange = (date) => {
        const formattedDate = date ? date.toISOString().split('T')[0] : '';
        onFilterChange({ date: formattedDate, from: '', to: '' });
    };

    const handleFromDateChange = (date) => {
        const formattedFrom = date ? date.toISOString().split('T')[0] : '';
        onFilterChange({ from: formattedFrom });
    };

    const handleToDateChange = (date) => {
        const formattedTo = date ? date.toISOString().split('T')[0] : '';
        onFilterChange({ to: formattedTo });
    };

    const handleCategoryChange = (e) => {
        onFilterChange({ categoryId: e.target.value });
    };

    const handleOrderChange = (e) => {
        onFilterChange({ order: e.target.value });
    };

    return (
        <Modal minWidth={360} maxWidth={400} onClose={onClose}>
            <Block isAlignCenter={true}>
                <Typography weight={700} size={24} bottom={18} align={'center'} text={'Фильтр'} />
            </Block>
        </Modal>
    );
}