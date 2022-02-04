export const endpoint = 'https://raw.githubusercontent.com/Ali-Alzyoud/MediaFilterFiles/main/Media';
const URLS = {
    RECORDS : endpoint+'/mediaRecords.json'
}


export async function getMediaRecords(){
    const response = await fetch(URLS.RECORDS+`?${Date.now()}`,{
        method: 'GET'
    });
    const status = response.status;
    const result = await response.json();
    return result;
}
