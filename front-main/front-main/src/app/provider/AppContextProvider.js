import React, { createContext, useContext, useState } from 'react';
import useAuth from "./hooks/useAuth";
import useAdmin from "./hooks/useAdmin";
import {useProduct} from "./hooks/useProduct";
import useRelations from "./hooks/useRelations";
import useReports from "./hooks/useReports";
import useOutcome from "./hooks/useOutcome";
import useSalary from "./hooks/useSalary";
import useIncome from "./hooks/useIncome";

const AppContext = createContext();

export function useAppContext() {
    return useContext(AppContext);
}

export function AppContextProvider({ children }) {

    const authHandler = useAuth();
    const adminHandler = useAdmin();
    const relationsHandler = useRelations();
    const productsHandler = useProduct();
    const reportsHandler = useReports();
    const outcomeHandler = useOutcome();
    const salaryHandler = useSalary();
    const incomeHandler = useIncome();

    return (
        <AppContext.Provider
            value={{
                authHandler,
                adminHandler,
                productsHandler,
                relationsHandler,
                reportsHandler,
                outcomeHandler,
                salaryHandler,
                incomeHandler
            }
        }>
            {children}
        </AppContext.Provider>
    );
}
