import React, {useEffect} from "react";
import styles from './CategoryItem.module.css';
import {Button, Link, Typography} from "../../../shared/ui";
import DeleteIcon from '../../../shared/assets/icons/delete_24dp_FILL0_wght400_GRAD0_opsz24.svg'
import EditIcon from '../../../shared/assets/icons/edit_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg'
import useToggle from "../../../shared/hooks/useToggle";
import {OutcomeEditCategory} from "../../../features/outcome/OutcomeEditCategory/OutcomeEditCategory";
import {OutcomeDeleteCategory} from "../../../features/outcome/OutcomeDeleteCategory/OutcomeDeleteCategory";
export function CategoryItem({ data }) {

    const [isCategoryDelete, toggleCategoryDelete] = useToggle()
    const [isCategoryUpdate, toggleCategoryUpdate] = useToggle()


    useEffect(() => {
        console.log('MYYYY CATEGORY', data)
    }, [])

    return (<>

        {isCategoryDelete && <OutcomeDeleteCategory categoryId={data.id} onClose={toggleCategoryDelete}/>}
        {isCategoryUpdate && <OutcomeEditCategory data={data} onClose={toggleCategoryUpdate} />}

        <div className={styles.EmployeeCard}>
            <div className={styles.EmployeeCard__fio}>
                <Typography size={16} weight={400} text={data.name}/>
            </div>


            <div className={styles.EmployeeCard__tools}>
                <Button variant={'clear'} onClick={toggleCategoryUpdate} isIconic={true}> <EditIcon/> </Button>
                <Button variant={'clear'}  onClick={toggleCategoryDelete} isIconic={true}> <DeleteIcon/> </Button>
            </div>
        </div>
    </>)
}