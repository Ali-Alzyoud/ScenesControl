import { ADD_ITEMS, SET_ITEMS, REMOVE_ITEM_INDEX, REMOVE_ALL, UPDATE_ITEM } from "../actionTypes";

const initialState = {
  records: [],
};

const SceneFilter = (state = initialState, action) => {
  switch (action.type) {
    case ADD_ITEMS: {
      const { records } = action.payload;
      return {
        ...state,
        records: [...records, ...state.records],
      };
    }
    case SET_ITEMS: {
      const { records } = action.payload;
      return {
        ...state,
        records: (records && records.length > 0) ? [...records] : [],
      };
    }
    case REMOVE_ITEM_INDEX: {
        const { index } = action.payload;
        const newRecords = state.records.filter((record, i) => i!==index);
        return {
          ...state,
          records: [...newRecords],
        };
      }
    case REMOVE_ALL: {
        return {
          ...state,
          records: [],
        };
      }
    case UPDATE_ITEM: {
        const { index, record } = action.payload;
        const newRecords = state.records.map((r, i) => i===index ? record : r);
        return {
          ...state,
          records: [...newRecords],
        };
      }
    default:
      return state;
  }
}

export default SceneFilter;
