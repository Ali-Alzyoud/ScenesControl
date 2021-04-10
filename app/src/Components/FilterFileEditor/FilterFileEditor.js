import React from 'react'
import './style.css'

export default function FilterFileEditor({sceneObject}) {
    return (
        <div>
            {
                sceneObject.Records.map(record => {
                    var fromDates = record.From.split(":");
                    var toDates = record.To.split(":");
                    return (
                        <tr>
                            <td>
                                <input className='bk' value={fromDates[0]} />&nbsp;:&nbsp;
                                <input className='bk' value={fromDates[1]} />&nbsp;:&nbsp;
                                <input className='bkLong' value={fromDates[2]} />
                            </td>
                            <div className='break'></div>
                            <td>
                                <input className='bk' value={toDates[0]} />&nbsp;:&nbsp;
                                <input className='bk' value={toDates[1]} />&nbsp;:&nbsp;
                                <input className='bkLong' value={toDates[2]} />
                            </td>
                            <td>
                                <select name='Type'>
                                    {/* {
    for (var key in SceneType) {
        var value = SceneType[key];
        if (typeof (value) == "string") {
                        str += "<option value='" + value + "'";
            if (value == sceneObject.Type) {
                        str += " selected"
                    }
            str += ">" + value + "</option>";
        }
    }
} */}
                                </select>
                            </td>
                            <td>
                                <select name='Age'>
                                    {/* for (var key in SceneIntensity) {
        var value = SceneIntensity[key];
        if (typeof (value) == "string") {
            str += "<option value='" + value + "'";
            if (value == sceneObject.Age) {
                str += " selected"
            }
            str += ">" + value + "</option>";
        }
    } */}
                                </select>
                            </td >
                        </tr >
                    )

                }
                )
            }
        </div>
    )
}
