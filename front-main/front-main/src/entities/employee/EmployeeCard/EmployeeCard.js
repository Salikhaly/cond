import React, {useEffect} from "react";
import styles from './EmployeeCard.module.css'
import {Button, Link, Typography} from "../../../shared/ui";
import DeleteIcon from '../../../shared/assets/icons/delete_24dp_FILL0_wght400_GRAD0_opsz24.svg'
import EditIcon from '../../../shared/assets/icons/edit_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg'
import SalaryIcon from '../../../shared/assets/icons/payments_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg'
import {useAppContext} from "../../../app/provider/AppContextProvider";
import {EmployeeDelete} from "../../../features/employee/delete/EmployeeDelete";
import useToggle from "../../../shared/hooks/useToggle";
import {EmployeeUpdate} from "../../../features/employee/update/EmployeeUpdate";
import {useNavigate} from "react-router-dom";
export function EmployeeCard({ data, isJustList=false }) {

    const [isEmployeeDelete, toggleEmployeeDelete] = useToggle()
    const [isEmployeeUpdate, toggleEmployeeUpdate] = useToggle()

    const navigate = useNavigate()

    function checkClick() {
        navigate(`/reports/${data.id}`, { state: data})
        console.log(data.id)
        // onClick()
    }

    function goToSalary() {
        navigate(`/salary/${data.id}`, { state: data})
        console.log(data.id)
    }

    useEffect(() => {
        console.log('MYYYY USER', data)
    }, [])

    return (<>

        {!isJustList && isEmployeeDelete && <EmployeeDelete employeeId={data.id} onClose={toggleEmployeeDelete}/>}
        {!isJustList && isEmployeeUpdate && <EmployeeUpdate data={data} employeeId={data.id} onClose={toggleEmployeeUpdate} />}

        <div className={styles.EmployeeCard}>
            <div className={styles.EmployeeCard__fio} onClick={checkClick}>
                <Typography size={16} weight={400} text={data.name}/>
            </div>

            {!isJustList && <>
                <div className={styles.EmployeeCard__tools}>
                    {data.role === 'employee' && <Button variant={'clear'} onClick={goToSalary} isIconic={true}> <SalaryIcon/> </Button>}
                    {/*<Link text={'Изменить'} size={16} onClick={toggleEmployeeUpdate} />*/}

                    <Button variant={'clear'} onClick={toggleEmployeeUpdate} isIconic={true}> <EditIcon/> </Button>
                    {data.role !== 'super_admin' && <Button variant={'clear'}  onClick={toggleEmployeeDelete} isIconic={true}> <DeleteIcon/> </Button>}
                </div>
            </>}
        </div>
    </>)
}