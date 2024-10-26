// website_api_v1.js
const express = require("express");
const db = require("./db"); // Import the database functions
const axios = require("axios");
const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");

const router = express.Router();
const mapKey = "AIzaSyAAlmEtjJOpSaJ7YVkMKwdSuMTbTx39l_o";
// Utility function to validate required fields
const checkMissingFields = (requiredFields) => {
  const missingFields = Object.keys(requiredFields).filter(
    (field) =>
      requiredFields[field] === undefined ||
      requiredFields[field] === null ||
      requiredFields[field] === ""
  );

  // Return missing fields if any, otherwise return null
  return missingFields.length > 0 ? missingFields : null;
};

// Ensure you have the correct uploads directory
const backendUploadsDir = "/root/vtpartner-backend/uploads";
const publicUploadsDir = "/var/www/vtpartner.org/uploads";

// Serve static files from the public uploads directory
router.use("/uploads", express.static(publicUploadsDir));

// Configure multer storage
const storage = multer.diskStorage({
  destination: backendUploadsDir, // Use the backend uploads directory
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

// Init upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Set limit to 10 MB
  },
  // limits: { fileSize: 1000000 }, // Optionally set limits
}).single("vtPartnerImage");

// Handle file upload
router.post("/upload", (req, res) => {
  console.log("Uploading Image::", req.body);
  upload(req, res, async (err) => {
    if (err) {
      console.log("Error Uploading Image::", err);
      return res.status(500).send("Error uploading file.");
    }

    // Check if file is uploaded
    if (!req.file) {
      return res.status(400).send("No file uploaded.");
    }

    // Define the source and destination paths
    const sourcePath = path.join(backendUploadsDir, req.file.filename);
    const destPath = path.join(publicUploadsDir, req.file.filename);

    try {
      // Move the file to the public uploads directory
      await fs.move(sourcePath, destPath);

      // Return the full image URL under your domain
      const imageUrl = `https://vtpartner.org/uploads/${req.file.filename}`;
      console.log("Uploaded ImageUrl::", imageUrl);
      res.status(200).json({ imageUrl });
    } catch (moveError) {
      console.error("Error moving file:", moveError);
      return res.status(500).send("Error moving uploaded file.");
    }
  });
});

router.post("/fare_result", async (req, res) => {
  try {
    const { category_id, city_id } = req.body;

    // List of required fields
    const requiredFields = {
      category_id,
      city_id,
    };

    // Use the utility function to check for missing fields
    const missingFields = checkMissingFields(requiredFields);

    // If there are missing fields, return an error response
    if (missingFields) {
      console.log(`Missing required fields: ${missingFields.join(", ")}`);
      return res.status(400).send({
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }
    const query =
      "select vehiclestbl.vehicle_id,vehicle_name,weight,size_image,starting_price_per_km from vtpartner.vehicle_city_wise_price_tbl,vtpartner.vehiclestbl where vehicle_city_wise_price_tbl.vehicle_id=vehiclestbl.vehicle_id and category_id=$1 and city_id=$2 order by weight asc";
    const values = [category_id, city_id];

    const result = await db.selectQuery(query, values);

    if (result.length === 0) {
      return res.status(404).send({ message: "No Data Found" });
    }

    res.status(200).send({
      fare_result: result,
    });
  } catch (err) {
    console.error("Error executing query", err.stack);
    if (err.message === "No Data Found")
      res.status(404).send({ message: "No Data Found" });
    else res.status(500).send({ message: "Internal Server Error" });
  }
});

router.post("/all_services", async (req, res) => {
  try {
    const query =
      "select category_id,category_name,category_type_id,category_image,category_type,epoch,description from vtpartner.categorytbl,vtpartner.category_type_tbl where category_type_tbl.cat_type_id=categorytbl.category_type_id order by category_id asc";
    const values = [];

    const result = await db.selectQuery(query);

    if (result.length === 0) {
      return res.status(404).send({ message: "No Data Found" });
    }

    res.status(200).send({
      services_details: result,
    });
  } catch (err) {
    console.error("Error executing query", err.stack);
    if (err.message === "No Data Found")
      res.status(404).send({ message: "No Data Found" });
    else res.status(500).send({ message: "Internal Server Error" });
  }
});

router.post("/all_allowed_cities", async (req, res) => {
  const { city_id } = req.body;

  try {
    const result = await db.selectQuery(
      "select city_id,city_name,pincode,bg_image,time,pincode_until,description,status,covered_distance from vtpartner.available_citys_tbl order by city_id"
      // [admin_id]
    );

    if (result.length === 0) {
      return res.status(404).send({ message: "No Data Found" });
    }

    res.status(200).send({
      cities: result,
    });
  } catch (err) {
    console.error("Error executing query", err.stack);
    if (err.message === "No Data Found")
      res.status(404).send({ message: "No Data Found" });
    else res.status(500).send({ message: "Internal Server Error" });
  }
});

router.post("/all_services", async (req, res) => {
  try {
    const query =
      "select category_id,category_name,category_type_id,category_image,category_type,epoch from vtpartner.categorytbl,vtpartner.category_type_tbl where category_type_tbl.cat_type_id=categorytbl.category_type_id order by category_id desc";
    const values = [];

    const result = await db.selectQuery(query);

    if (result.length === 0) {
      return res.status(404).send({ message: "No Data Found" });
    }

    res.status(200).send({
      services_details: result,
    });
  } catch (err) {
    console.error("Error executing query", err.stack);
    if (err.message === "No Data Found")
      res.status(404).send({ message: "No Data Found" });
    else res.status(500).send({ message: "Internal Server Error" });
  }
});

router.post("/all_vehicles", async (req, res) => {
  try {
    const { category_id } = req.body;

    // List of required fields
    const requiredFields = {
      category_id,
    };

    // Use the utility function to check for missing fields
    const missingFields = checkMissingFields(requiredFields);

    // If there are missing fields, return an error response
    if (missingFields) {
      console.log(`Missing required fields: ${missingFields.join(", ")}`);
      return res.status(400).send({
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const query =
      "select vehicle_id,vehicle_name,weight,vehicle_types_tbl.vehicle_type_id,vehicle_types_tbl.vehicle_type_name,description,image,size_image from vtpartner.vehiclestbl,vtpartner.vehicle_types_tbl where vehiclestbl.vehicle_type_id=vehicle_types_tbl.vehicle_type_id and category_id=$1 order by vehicle_id desc";
    const values = [category_id];

    const result = await db.selectQuery(query, values);

    if (result.length === 0) {
      return res.status(404).send({ message: "No Data Found" });
    }

    res.status(200).send({
      vehicle_details: result,
    });
  } catch (err) {
    console.error("Error executing query", err.stack);
    if (err.message === "No Data Found")
      res.status(404).send({ message: "No Data Found" });
    else res.status(500).send({ message: "Internal Server Error" });
  }
});


router.post("/all_vehicles_with_price", async (req, res) => {
  try {
    const { category_id, city_id } = req.body;

    // List of required fields
    const requiredFields = {
      category_id,
      city_id,
    };

    // Use the utility function to check for missing fields
    const missingFields = checkMissingFields(requiredFields);

    // If there are missing fields, return an error response
    if (missingFields) {
      console.log(`Missing required fields: ${missingFields.join(", ")}`);
      return res.status(400).send({
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }
    const query = `
    SELECT 
        v.vehicle_id,
        v.vehicle_name,
        v.weight,
        vt.vehicle_type_id,
        vt.vehicle_type_name,
        v.description,
        v.image,
        v.size_image,
        vc.starting_price_per_km
    FROM 
        vtpartner.vehiclestbl v
    JOIN 
        vtpartner.vehicle_types_tbl vt ON v.vehicle_type_id = vt.vehicle_type_id
    LEFT JOIN 
        vtpartner.vehicle_city_wise_price_tbl vc ON v.vehicle_id = vc.vehicle_id 
    WHERE 
        v.category_id = $1 AND vc.city_id = $2
    ORDER BY 
        v.vehicle_id DESC
  `;
    const values = [category_id, city_id];

    const result = await db.selectQuery(query, values);

    if (result.length === 0) {
      return res.status(404).send({ message: "No Data Found" });
    }

    res.status(200).send({
      vehicle_details: result,
    });
  } catch (err) {
    console.error("Error executing query", err.stack);
    if (err.message === "No Data Found")
      res.status(404).send({ message: "No Data Found" });
    else res.status(500).send({ message: "Internal Server Error" });
  }
});

router.post("/all_sub_categories", async (req, res) => {
  try {
    const { category_id } = req.body;

    // List of required fields
    const requiredFields = {
      category_id,
    };

    // Use the utility function to check for missing fields
    const missingFields = checkMissingFields(requiredFields);

    // If there are missing fields, return an error response
    if (missingFields) {
      return res.status(400).send({
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const query =
      "select sub_cat_id,sub_cat_name,cat_id,image,epoch_time from vtpartner.sub_categorytbl where cat_id=$1 order by sub_cat_id desc";
    const values = [category_id];

    const result = await db.selectQuery(query, values);

    if (result.length === 0) {
      return res.status(404).send({ message: "No Data Found" });
    }

    res.status(200).send({
      sub_categories_details: result,
    });
  } catch (err) {
    console.error("Error executing query", err.stack);
    if (err.message === "No Data Found")
      res.status(404).send({ message: "No Data Found" });
    else res.status(500).send({ message: "Internal Server Error" });
  }
});

router.post("/all_other_services", async (req, res) => {
  try {
    const { sub_cat_id } = req.body;

    // List of required fields
    const requiredFields = {
      sub_cat_id,
    };

    // Use the utility function to check for missing fields
    const missingFields = checkMissingFields(requiredFields);

    // If there are missing fields, return an error response
    if (missingFields) {
      return res.status(400).send({
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const query =
      "select service_id,service_name,sub_cat_id,service_image,time_updated from vtpartner.other_servicestbl where sub_cat_id=$1 order by sub_cat_id desc";
    const values = [sub_cat_id];

    const result = await db.selectQuery(query, values);

    if (result.length === 0) {
      return res.status(404).send({ message: "No Data Found" });
    }

    res.status(200).send({
      other_services_details: result,
    });
  } catch (err) {
    console.error("Error executing query", err.stack);
    if (err.message === "No Data Found")
      res.status(404).send({ message: "No Data Found" });
    else res.status(500).send({ message: "Internal Server Error" });
  }
});

router.post("/all_delivery_gallery_images", async (req, res) => {
  try {
    const query =
      "select gallery_id,image_url,category_type,epoch from vtpartner.service_gallerytbl,vtpartner.category_type_tbl where service_gallerytbl.category_type_id=category_type_tbl.cat_type_id and service_gallerytbl.category_type_id='1' order by gallery_id asc";

    const result = await db.selectQuery(query);

    if (result.length === 0) {
      return res.status(404).send({ message: "No Data Found" });
    }

    res.status(200).send({
      gallery_data_delivery: result,
    });
  } catch (err) {
    console.error("Error executing query", err.stack);
    if (err.message === "No Data Found")
      res.status(404).send({ message: "No Data Found" });
    else res.status(500).send({ message: "Internal Server Error" });
  }
});

router.post("/all_services_gallery_images", async (req, res) => {
  try {
    const query =
      "select gallery_id,image_url,category_type,epoch from vtpartner.service_gallerytbl,vtpartner.category_type_tbl where service_gallerytbl.category_type_id=category_type_tbl.cat_type_id and service_gallerytbl.category_type_id='2' order by gallery_id asc";

    const result = await db.selectQuery(query);

    if (result.length === 0) {
      return res.status(404).send({ message: "No Data Found" });
    }

    res.status(200).send({
      gallery_data_services: result,
    });
  } catch (err) {
    console.error("Error executing query", err.stack);
    if (err.message === "No Data Found")
      res.status(404).send({ message: "No Data Found" });
    else res.status(500).send({ message: "Internal Server Error" });
  }
});

router.post("/add_new_enquiry", async (req, res) => {
  try {
    const {
      category_id,
      sub_cat_id,
      service_id,
      vehicle_id,
      city_id,
      name,
      mobile_no,
      source_type,
    } = req.body;

    // List of required fields
    const requiredFields = {
      category_id,
      sub_cat_id,
      service_id,
      vehicle_id,
      city_id,
      name,
      mobile_no,
      source_type,
    };

    // Use the utility function to check for missing fields
    const missingFields = checkMissingFields(requiredFields);

    // If there are missing fields, return an error response
    if (missingFields) {
      console.log(`Missing required fields: ${missingFields.join(", ")}`);
      return res.status(400).send({
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Validating to avoid duplication
    const queryDuplicateCheck =
      "SELECT COUNT(*) FROM vtpartner.enquirytbl WHERE name ILIKE $1 AND category_id=$2";
    const valuesDuplicateCheck = [name, category_id];

    const result = await db.selectQuery(
      queryDuplicateCheck,
      valuesDuplicateCheck
    );

    // Check if the result is greater than 0 to determine if the pincode already exists
    if (result.length > 0 && result[0].count > 0) {
      return res
        .status(409)
        .send({ message: "Enquiry Request already exists" });
    }

    // If pincode is not duplicate, proceed to insert
    const query =
      "INSERT INTO vtpartner.enquirytbl (category_id,sub_cat_id,service_id,vehicle_id,city_id,name,mobile_no,source_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)";
    const values = [
      category_id,
      sub_cat_id,
      service_id,
      vehicle_id,
      city_id,
      name,
      mobile_no,
      source_type,
    ];
    const rowCount = await db.insertQuery(query, values);

    // Send success response
    res.status(200).send({ message: `${rowCount} row(s) inserted` });
  } catch (err) {
    console.error("Error executing add new Enquiry query", err.stack);
    res.status(500).send({ message: "Error executing add new Enquiry query" });
  }
});

router.get("/distance", async (req, res) => {
  const { origins, destinations } = req.query;
  const apiKey = mapKey;

  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=place_id:${origins}&destinations=place_id:${destinations}&units=metric&key=${apiKey}`
    );
    // res.json(response.data);
    res.status(200).json(response.data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Error fetching distance data" });
  }
});

module.exports = router;