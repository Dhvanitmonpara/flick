import { PopulateOptions, Types, Document, Query } from "mongoose";
import userModel from "../models/user.model.js";

class UserService {
  async getUserByIdAndPopulate<T = any>(
    userId: Types.ObjectId,
    {
      select = "",
      populate = [],
      lean = true,
    }: {
      select?: string | string[];
      populate?: string | PopulateOptions[];
      lean?: boolean;
    } = {}
  ): Promise<T | (Document<unknown, {}, any> & T) | null> {
    let query = userModel.findById(userId) as Query<
      T | (Document<unknown, {}, any> & T) | null,
      Document
    >;

    if (Array.isArray(select)) {
      query = query.select(select.join(" "));
    } else if (typeof select === "string" && select.length) {
      query = query.select(select);
    }

    if (populate) {
      if (typeof populate === "string") {
        query = query.populate(populate);
      } else if (Array.isArray(populate)) {
        for (const pop of populate) {
          query = query.populate(pop);
        }
      }
    }

    if (lean) {
      query = query.lean<T>();
    }

    return await query.exec();
  }
}

export default UserService;