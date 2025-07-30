import express from "express";
import mongoose from "mongoose";
import verifyAdmin from "../middleware/verifyadmin.js";
import Study from "../models/study.js";

const router = express.Router();


router.get("/", verifyAdmin, async (req, res) => {
  try {
    const { genre, title, page = 1, limit = 10 , approved} = req.query;
    const queryOptions = {};
    
    if (approved) {
      if (approved === "true") {
        queryOptions.approved = true;
      } else if (approved === "false") {
        queryOptions.approved = false;  
      }
    }

    if (genre) {
      if (Array.isArray(genre)) {
        queryOptions.genres = { $in: genre.map((g) => new RegExp(g, "i")) };
      } else {
        queryOptions.genres = { $in: [new RegExp(genre, "i")] };
      }
    }
    if (title) {
      queryOptions.title = { $regex: title, $options: "i" };
    }

    const studies = await Study.find(queryOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ created_at: -1 })
      .lean();

    const count = await Study.countDocuments(queryOptions);

    res.json({
      studies,
      totalPages: Math.ceil(count / parseInt(limit)),
      currentPage: parseInt(page),
      totalStudies: count,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching studies", error: error.message });
  }
});



router.get("/:id",verifyAdmin, async (req, res) => {
  const studyId = req.params.id;
  try {
    if (!mongoose.Types.ObjectId.isValid(studyId)) {
      return res.status(400).json({ message: "Invalid study ID format" });
    }
    const study = await Study.findById(studyId).lean();
    if (!study) {
      return res.status(404).json({ message: "Study not found" });
    }
    res.json(study);
  } catch (error) {
    if (error.name === "CastError" && error.kind === "ObjectId") {
      return res
        .status(400)
        .json({ message: "Invalid study ID format (CastError)" });
    }
    res
      .status(500)
      .json({ message: "Error fetching study", error: error.message });
  }
});


// router.patch("/:id/approve", verifyAdmin, async (req, res) => {
//   const { id: studyId } = req.params;
//   const { approved } = req.body;

//   // 1. More robust validation for the 'approved' field
//   if (typeof approved !== 'boolean') {
//     return res.status(400).json({ message: "The 'approved' field must be a boolean (true or false)." });
//   }
  
//   // 2. The existing ID validation is good, let's keep it
//   if (!mongoose.Types.ObjectId.isValid(studyId)) {
//     return res.status(400).json({ message: "Invalid study ID format." });
//   }

//   try {
//     const updatedStudy = await Study.findOneAndUpdate(
//       { _id: studyId.toString() }, // Ensures the ID is treated as a string
//       { $set: { approved: approved } }, // Using $set is explicit and safer
//       { new: true, runValidators: true }
//     ); // 3. Removed .lean() for this use case

//     if (!updatedStudy) {
//       return res.status(404).json({ message: "Study not found with the given ID." });
//     }

//     res.status(200).json({ message: "Study approval status updated successfully.", study: updatedStudy });

//   } catch (error) {
//     // 4. Enhanced server-side error logging
//     console.error("Error updating study:", error); 
//     res.status(500).json({ message: "An internal server error occurred.", error: error.message });
//   }
// });


router.patch("/:id/approve", verifyAdmin, async (req, res) => {
    const { id: studyId } = req.params;
    const { approved } = req.body;
    console.log(`Received request to update approval status for study: ${studyId} to ${typeof studyId} (${approved})`);

    if (typeof approved !== 'boolean') {
        return res.status(400).json({ message: "The 'approved' field must be a boolean." });
    }

    try {
        // 1. Create the query object to handle both ID types
        let query;

        // 2. Check if the incoming ID string could possibly be an ObjectId
        if (mongoose.Types.ObjectId.isValid(studyId)) {
            // If it could be, search for either the string OR the ObjectId
            console.log(`Study ID ${studyId} is a valid ObjectId format.`);
            query = {
                $or: [
                    { _id: studyId }, // Matches documents with a string ID
                    { _id: new mongoose.Types.ObjectId(studyId) } // Matches documents with an ObjectId
                ]
            };
        } else {
            // If it can't be an ObjectId, it must be a string
            query = { _id: studyId };
        }

        // 3. Use the dynamic query object to find the document
        const updatedStudy = await Study.findOneAndUpdate(
            query, // Use our new query here
            { $set: { approved: approved } },
            { new: true, runValidators: true }
        );

        if (!updatedStudy) {
            return res.status(404).json({ message: "Study not found with the given ID." });
        }

        res.status(200).json({ message: "Study approval status updated successfully.", study: updatedStudy });

    } catch (error) {
        console.error("Error updating study:", error);
        res.status(500).json({ message: "An internal server error occurred." });
    }
});

router.delete("/:id", verifyAdmin, async (req, res) => {
  const studyId = req.params.id;
  const userIdToken = req.user.uid;

  try {
    if (!mongoose.Types.ObjectId.isValid(studyId)) {
      return res.status(400).json({ message: "Invalid study ID format" });
    }

    const study = await Study.findById(studyId);
    if (!study) {
      return res.status(404).json({ message: "Study not found" });
    }
    if (study.researcher_id.toString() !== userIdToken) {
      return res
        .status(403)
        .json({ message: "User not authorized to delete this study" });
    }

    if (study.documents && study.documents.length > 0) {
      study.documents.forEach((doc) => {
        if (doc.file_location && !doc.file_location.startsWith("http")) {
          const filePath = path.join(__dirname, "..", doc.file_location);
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          } catch (fileError) {
            console.warn(`Error deleting file ${filePath}`, fileError);
          }
        }
      });
    }

    const result = await Study.findByIdAndDelete(studyId);
    if (!result) {
      return res.status(404).json({ message: "Study not found for deletion." });
    }
    res.json({ message: "Study deleted successfully" });
  } catch (error) {
    if (error.name === "CastError" && error.kind === "ObjectId")
      return res
        .status(400)
        .json({ message: "Invalid study ID format (CastError)" });
    res
      .status(500)
      .json({ message: "Error deleting study", error: error.message });
  }
});

export default router;