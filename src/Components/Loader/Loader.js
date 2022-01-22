import React from 'react'
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import './style.css'

export default function Loader() {
    return (
        <div className='loader-container'>
            <AiOutlineLoading3Quarters className='loader-icon' />
        </div>
    )
}
