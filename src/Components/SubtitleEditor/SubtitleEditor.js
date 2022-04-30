import React from 'react'
import { FaSave } from 'react-icons/fa'
import { connect } from "react-redux";
import { selectSubtitle, selectSubtitleSync } from '../../redux/selectors';

import './style.css'
import SubtitleRecord from './SubtitleRecord';

function SubtitleEditor(props) {
    const {
        subtitle,
        subtitleSync
    } = props;

    const saveItems = () => {
        // const element = document.createElement("a");
        // const file = new Blob([SceneGuideClass.ToString(records)], { type: 'text/plain' });
        // element.href = URL.createObjectURL(file);
        // element.download = videoName+".txt";
        // document.body.appendChild(element); // Required for this to work in FireFox
        // element.click();
    }

    return (
        <div className='editor-container'>
            <div className='container' onClick={saveItems}>
                <FaSave className='middle' />
            </div>
            <br /><br />
            <div className='table-container'>
                <table>
                    <tr>
                        <th>From</th>
                        <th>To</th>
                        <th>Content</th>
                    </tr>
                    {
                        subtitle.map((record, index) => {
                            return <SubtitleRecord
                                record={record}
                                // index={index}
                                // record={record}
                                // isSelected={selectedRecord === record}
                                // removeItem={removeItem}
                                // updateItem={updateItem}
                                // selectItem={selectItem} 
                                />
                        })
                    }
                </table>
            </div>
        </div>
    )
}


const mapStateToProps = state => {
    const subtitle = selectSubtitle(state);
    const subtitleSync = selectSubtitleSync(state);
    return { subtitle, subtitleSync };
};

export default connect(mapStateToProps, 
    {
    })(SubtitleEditor);