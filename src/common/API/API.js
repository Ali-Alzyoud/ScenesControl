export const endpoint = 'https://raw.githubusercontent.com/Ali-Alzyoud/MediaFilterFiles/main/Media';
const URLS = {
    RECORDS : endpoint+'/mediaRecords.json',
    STREAMS : '18.159.209.161/s3Proxy'
}


export async function getMediaRecords(){
    const response = await fetch(URLS.RECORDS+`?${Date.now()}`,{
        method: 'GET'
    });
    const status = response.status;
    const result = await response.json();
    return result;
}

export async function getStream(videoFile){
    let response; 
    let blob;
    try{
    response = await fetch(URLS.STREAMS,{
        method: 'GET'
    });
    }
    catch(ex){
        console.log(ex)
    }
    const status = response.status;
    try{
        blob = await response.blob();
    }
    catch(ex){
        console.log(ex)
    }
    const newBlob = new Blob([blob]);
    const blobUrl = window.URL.createObjectURL(newBlob);

    return blobUrl;
}
