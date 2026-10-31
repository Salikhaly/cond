import React from 'react';
import {Routes, Route} from "react-router-dom";
import MainPage from "../../pages/MainPage";
import Authentication from "../../pages/auth/main/Authentication";
import Activation from "../../pages/auth/activation/Activation";
import Logout from "../../pages/auth/logout/Logout";
import NotFoundPage from "../../pages/NotFoundPage";
import useAdaptive from "../../shared/hooks/adaptive/useAdaptive";
import PageProtected from "../middlewares/PageProtected";
import Page from "../middlewares/Page";
import {EmployeesPage} from "../../pages/EmployeesPage";
import {RelationsPage} from "../../pages/RelationsPage";
import {ProductsPage} from "../../pages/ProductsPage";
import {FinancePage} from "../../pages/FinancePage";
import {OneRelationPage} from "../../pages/OneRelationPage";
import {OneReportPage} from "../../pages/OneReportPage";
import {OutcomeCategoriesPage} from "../../pages/OutcomeCategoriesPage";
import {SalaryPage} from "../../pages/SalaryPage";



export default function Router(){

	const { device } = useAdaptive();

	if (device === 'mobile' || device === 'tablet' || device === 'desktop') {
		return (<>
			<Routes>

				<Route
					path={'/'}
					element={
						<PageProtected>
							<MainPage />
						</PageProtected>
					}
				/>
				<Route
					path={'/employees'}
					element={
						<PageProtected role={'super_admin'}>
							<EmployeesPage />
						</PageProtected>
					}
				/>

				<Route
					path={'/business'}
					element={
						<PageProtected role={'super_admin'}>
							<RelationsPage />
						</PageProtected>
					}
				/>
				<Route
					path={'/business/:id'}
					element={
						<PageProtected role={'super_admin'}>
							<OneRelationPage />
						</PageProtected>
					}
				/>

				<Route
					path={'/products'}
					element={
						<PageProtected>
							<ProductsPage />
						</PageProtected>
					}
				/>

				<Route
					path={'/finance'}
					element={
						<PageProtected>
							<FinancePage />
						</PageProtected>
					}
				/>

				<Route
					path={'/outcome/categories'}
					element={
						<PageProtected>
							<OutcomeCategoriesPage />
						</PageProtected>
					}
				/>
				<Route
					path={'/reports/:employeeId'}
					element={
						<PageProtected role={'super_admin'}>
							<OneReportPage />
						</PageProtected>
					}
				/>
				<Route
					path={'/salary/:employeeId'}
					element={
						<PageProtected role={'super_admin'}>
							<SalaryPage />
						</PageProtected>
					}
				/>



				{/** Authentication Pages */}
				<Route path='/auth'>
					<Route index element={
						<Page>
							<Authentication />
						</Page>

					}/>

					<Route path='activation' element={
						<Page>
							<Activation />
						</Page>
					}/>

					<Route path='logout' element={
						<Page>
							<Logout />
						</Page>
					}/>

					{/*<Route path='send-reset' element={<Page><SendResetPasswordMail /></Page>} />
					<Route path='reset' element={<Page><ResetPassword /></Page>} />
					<Route path='activation' element={<Page><Activation /></Page>}/>*/}

				</Route>


				<Route path={'*'} element={
					<NotFoundPage />
				}/>


			</Routes>
		</>);
	}

}

/*
▄───▄
█▀█▀█
█▄█▄█
─███──▄▄
─████▐█─█
─████───█
─▀▀▀▀▀▀▀
*/