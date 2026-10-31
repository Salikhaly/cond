import React, {useEffect, useState} from "react";
import {Block, Button, Typography} from "../../shared/ui";
import {EmployeeCard} from "../../entities/employee/EmployeeCard/EmployeeCard";
import {useAppContext} from "../../app/provider/AppContextProvider";
import {EmployeeCreate} from "../../features/employee/create/EmployeeCreate";
import useToggle from "../../shared/hooks/useToggle";
import {EmployeeUpdate} from "../../features/employee/update/EmployeeUpdate";

export function EmployeesManage({  }) {

    const { adminHandler } = useAppContext()
    const { users, getUsers } = adminHandler
    const [employees, setEmployees] = useState([])

    const [isEmployeeCreate, toggleEmployeeCreate] = useToggle()

    useEffect(() => {
        (async () => {
            await getUsers()
        })()
        setEmployees(users)
        console.log('ALL EMPLOYEES', employees)
    }, []);


    useEffect(() => {
        setEmployees(users)
    }, [users]);

    return (<Block width={'100%'}>
        {isEmployeeCreate && <EmployeeCreate onClose={toggleEmployeeCreate} />}

        <Block marginBottom={20}>
            <Typography size={24} weight={700} text={'Управление сотрудниками'}/>
            <Button width={'fit-content'} marginTop={10} onClick={toggleEmployeeCreate}>Добавить</Button>
        </Block>

        {employees.length < 1 && <Typography size={16} weight={400} text={'Нет сотрудников. Добавьте.'}/>}

        {employees.map( (e, eid) => {
            if (e.role !== 'super_admin') {
                return <EmployeeCard key={eid} data={e} />
            }
        })}

    </Block>)
}