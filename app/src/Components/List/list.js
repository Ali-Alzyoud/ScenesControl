import React, {useRef, useEffect} from 'react'
import './list.css'

export default function List() {
    const list = useRef(null);
    useEffect(() => {
        var listItems = list.current.getElementsByClassName("video");
        for (var i = 0; i < listItems.length; i++) {
            listItems[i].addEventListener("click", function () {
                var current = list.current.getElementsByClassName("selected");
                current[0].className = current[0].className.replace(" selected", "");
                this.className += " selected";
            });
        }
    }, [])
    return (
        <div style={{ marginLeft: '20px', width: '200px', height: '360px', background: 'lightgray', float: 'right' }}>
            <ul className='video' ref={list}>
                <li className='video selected'>Joker Video</li>
                <li className='video'>Joker Video</li>
                <li className='video'>Joker Video</li>
                <li className='video'>Joker Video</li>
            </ul>
        </div>
    )
}
