import React from "react";
import {Box} from "../shared/ui";
import {EmployeesManage} from "../widgets/EmployeesManage/EmployeesManage";

export function EmployeesPage() {


    return (<Box isScrollable={true} isContainer={true}>
        <EmployeesManage employees={[]} />
    </Box>)
}