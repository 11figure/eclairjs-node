/*
 * Copyright 2015 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

function exit() {
  process.exit();
}

function stop(e) {
  if (e) {
    console.log(e);
  }
  sc.stop().then(exit).catch(exit);
}

var spark = require('../../lib/index.js');

function run(sc) {
  return new Promise(function(resolve, reject) {
    var sqlContext = new spark.sql.SQLContext(sc);

    // Create some vector data; also works for sparse vectors
    var rdd = sc.parallelize([
      spark.sql.RowFactory.create(["a", spark.mllib.linalg.Vectors.dense([1.0, 2.0, 3.0])]),
      spark.sql.RowFactory.create(["b", spark.mllib.linalg.Vectors.dense([4.0, 5.0, 6.0])])
    ]);

    var fields = [
      spark.sql.types.DataTypes.createStructField("id", spark.sql.types.DataTypes.StringType, false),
      spark.sql.types.DataTypes.createStructField("vector", new spark.mllib.linalg.VectorUDT(), false)
    ];

    var schema = spark.sql.types.DataTypes.createStructType(fields);

    var dataFrame = sqlContext.createDataFrame(rdd, schema);

    var transformingVector = spark.mllib.linalg.Vectors.dense([0.0, 1.0, 2.0]);

    var transformer = new spark.ml.feature.ElementwiseProduct()
      .setScalingVec(transformingVector)
      .setInputCol("vector")
      .setOutputCol("transformedVector");

    transformer.transform(dataFrame).take(10).then(resolve).catch(reject);
  });
}

if (global.SC) {
  // we are being run as part of a test
  module.exports = run;
} else {
  var sc = new spark.SparkContext("local[*]", "Elementwise Product");
  run(sc).then(function(results) {
    console.log('Results:', JSON.stringify(results));
    stop();
  }).catch(stop);
}