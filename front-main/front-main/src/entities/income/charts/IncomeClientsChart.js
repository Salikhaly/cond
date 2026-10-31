// // SalesChart.js
// import React, { useEffect, useState } from 'react';
// import { Line } from 'react-chartjs-2';
// import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
//
// ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);
//
// export function IncomeClientsChart () {
//     const [chartData, setChartData] = useState({ labels: [], datasets: [] });
//
//
//     const [isLoading, setIsLoading] = useState(false)
//     const [products, setProducts] = useState([])
//
//     const getProducts = async () => {
//         setIsLoading(true)
//         try {
//             const response = await fetch(API_URL+`/relations/${clientId}/products`, {
//                 method: 'GET',
//                 headers: {
//                     'Authorization': 'Bearer '+localStorage.getItem('token'),
//                     'Content-Type': 'application/json',
//                 },
//             });
//
//             if (response.ok) {
//                 const result = await response.json();
//                 console.log('SELECT INCOME CLIENT PRODUCTS :',result);
//
//                 setProducts(result.products);
//             } else {
//                 console.error('Error fetching data products:', response.status);
//             }
//         } catch (error) {
//             console.error('Fetch error:', error);
//         }
//         setIsLoading(false)
//     }
//
//     // Получение данных с сервера
//     useEffect(() => {
//         // Замените URL на ваш серверный эндпоинт
//         fetch('/api/sales')
//             .then((response) => response.json())
//             .then((salesData) => {
//                 // Пример преобразования данных
//                 const labels = salesData.map((sale) => sale.date);
//                 const quantities = salesData.map((sale) => sale.quantity);
//                 const revenues = salesData.map((sale) => sale.quantity * sale.price);
//
//                 setChartData({
//                     labels,
//                     datasets: [
//                         {
//                             label: 'Количество продаж',
//                             data: quantities,
//                             borderColor: 'rgba(75, 192, 192, 1)',
//                             backgroundColor: 'rgba(75, 192, 192, 0.2)',
//                             fill: true,
//                         },
//                         {
//                             label: 'Выручка',
//                             data: revenues,
//                             borderColor: 'rgba(153, 102, 255, 1)',
//                             backgroundColor: 'rgba(153, 102, 255, 0.2)',
//                             fill: true,
//                         },
//                     ],
//                 });
//             });
//     }, []);
//
//     return (
//         <div>
//             <h2>График продаж</h2>
//             <Line data={chartData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
//         </div>
//     );
// };
//
// export default SalesChart;
