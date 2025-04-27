
class Utils {
    static hasActiveInput = ()=>{
        var activeElement = document.activeElement;
        var inputs = ['input', 'select', 'button', 'textarea'];

        if (activeElement && inputs.indexOf(activeElement.tagName.toLowerCase()) !== -1) {
            return true;
        }
        return false;
    }
};

export default Utils;

