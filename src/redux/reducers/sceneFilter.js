import { ADD_ITEMS, REMOVE_ITEMS, REMOVE_ALL, UPDATE_ITEM } from "../actionTypes";

const initialState = {
  records: [],
};

const SceneFilter = (state = initialState, action) => {
  switch (action.type) {
    case ADD_ITEMS: {
      const { records } = action.payload;
      return {
        ...state,
        records: [...state.records, ...records],
      };
    }
    case REMOVE_ITEMS: {
        const { records } = action.payload;
        const newRecords = state.records.filter(record => !records.contains(record));
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