// lib/models/User.ts
import { Schema, model, models, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";

// Interface for User document
interface IUser extends Document {
  username: string;
  password: string;
  role: "admin" | "showroom";
  showroomName?: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Interface for User model
interface IUserModel extends Model<IUser> {
  // You can add static methods here if needed
}

const userSchema = new Schema<IUser, IUserModel>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "showroom"],
      required: true,
      default: "showroom",
    },
    showroomName: {
      type: String,
      required: function (this: IUser) {
        return this.role === "showroom";
      },
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err: any) {
    next(err);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User: IUserModel =
  models.User || model<IUser, IUserModel>("User", userSchema);

export default User;
