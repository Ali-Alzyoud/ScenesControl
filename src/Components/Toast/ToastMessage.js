import React, {useState, useEffect} from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setToastText } from '../../redux/actions';
import { selectToastText, selectToastTimeout } from '../../redux/selectors';
import './style.css'

export default function ToastMessage() {

    const toast = useSelector(selectToastText);
    const time = useSelector(selectToastTimeout);
    const dispatch = useDispatch();

    useEffect(() => {
        if (toast) {
            setTimeout(() => {
                dispatch(setToastText(''));
            }, time);
        }
    }, [toast])

    return (
        toast ?
            <div className='toast'>{toast}</div>
            :
            null
    )
}
