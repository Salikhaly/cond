import React, {useEffect, useState} from "react";
import {Button} from "../../../shared/ui";
import DownloadIcon from '../../../shared/assets/icons/upload_file_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg'
import {Loading} from "../../../widgets/Loading";
import {$api} from "../../../app/http";
const API_URL = process.env.API_URL_DEV

export function OutcomeDownloadPdf({ filter }) {

    const [isLoading, setIsLoading] = useState(false)

    function formatCurrentDateTime() {
        const now = new Date();

        // Получаем компоненты даты и времени
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0'); // Месяцы начинаются с 0
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        // Форматируем строку
        return `${year}${month}${day}_${hours}${minutes}${seconds}`;
    }
    async function fetchPdf() {
        setIsLoading(true);

        try {
            const response = await $api.get(API_URL + '/outcome/download', {
                params: filter,
                responseType: 'blob' // Чтобы получить файл в виде Blob
            });

            // Создание ссылки для скачивания PDF
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;

            const nowDateText = formatCurrentDateTime()
            link.setAttribute('download', `outcome_report_${nowDateText}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('ERROR OUTCOME DOWNLOAD PDF: ', err);
        } finally {
            setIsLoading(false);
        }
    }

    function onClick() {
        (async () => {
            await fetchPdf()
        })()
    }


    useEffect(() => {
        console.log('OUTCOME DOWNLOAD PDF: filter', filter)
    }, [filter]);

    return (<>
        {isLoading && <Loading/> }

        <Button
            width={'fit-content'}
            isIconic
            // size={'small'}
            onClick={onClick}
            borderRadius={16}
        >
            <DownloadIcon/>
        </Button>
    </>)
}