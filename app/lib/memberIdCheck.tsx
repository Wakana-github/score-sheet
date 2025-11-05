
/*Check member Id is either mongo objectId or UUID*/

import mongoose from "mongoose";

export const isValidMemberId = (id: string): boolean => {
  //check if it's MongoDB ObjectId or UUID v4
  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return isObjectId || uuidRegex.test(id);
};