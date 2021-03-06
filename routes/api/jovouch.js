const { Vouch, JoVouch, Accounts } = require("../../db/db");
const { auth } = require("../../middleware/auth");
const route = require("express").Router();
const seq = require("sequelize");
const isSuspended = require("../../middleware/suspended");

route.post("/", auth, async (req, res) => {
  if (process.env.apiLogs == "true") {
    console.log("[post]/api/jovouch");
  }
  if (process.env.apiBodyData == "true") {
    console.log("[post Data]");
    console.log(req.body);
  }
  let v = req.body;
  let user = req.user.id;

  let Spay = v.payArr.map((e) => {
    let s = " " + e.mode + ":" + e.det + ":" + e.amt + ":" + e.det2;
    return s;
  });
  try {
    let NewJoVouch = await JoVouch.create({
      UserId: user,
      bill_date: v.bill_date,
      type: v.type,
      credit_acc: v.credit_acc,
      credit_acc_id: v.credit_acc_id,
      debit_acc: v.debit_acc,
      debit_acc_id: v.debit_acc_id,
      payArr: Spay,
      billArr: v.billArr,
      amount: v.amount,
      balance: v.balance,
    });

    let payAm = parseInt(NewJoVouch.amount) - parseInt(NewJoVouch.balance);

    NewJoVouch.billArr.map(async (e) => {
      let vouch = await Vouch.findOne({
        where: {
          [seq.Op.and]: [{ UserId: user }, { bill_num: e }],
        },
      });
      let a = parseInt(payAm) - parseInt(vouch.totalAmt);
      if (a >= 0) {
        vouch.status = 0;
        vouch.save();
        payAm = parseInt(payAm) - parseInt(vouch.totalAmt);
      } else if (a < 0) {
        vouch.status = a;
        vouch.save();
        payAm = 0;
      }
    });

    res.status(201).send(true);
  } catch (err) {
    console.error("*** At post jo vouch :-  " + err);
    res.status(500).send({ error: "unable to add JoVouchers" });
  }
});

route.delete("/:id", auth, async (req, res) => {
  if (process.env.apiLogs == "true") {
    console.log("[delete]/api/jovouch");
  }
  if (process.env.apiBodyData == "true") {
    console.log("[delete Data]");
    console.log(req.query);
  }
  try {
    let user = req.user.id;
    let jovouch = await JoVouch.findOne({
      where: {
        [seq.Op.and]: [{ UserId: req.user.id }, { id: req.params.id }],
      },
    });

    jovouch.IsDeleted = true;
    console.log(jovouch + "bill Arr");
    jovouch.billArr.map(async (e) => {
      let vouch = await Vouch.findOne({
        where: {
          [seq.Op.and]: [{ UserId: user }, { bill_num: e }],
        },
      });
      console.log(vouch + "vouch");
      vouch.status = 1;
      vouch.save();
    });

    jovouch.save();
    res.status(201).send({ deleted: "jovouch" + req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "internal error" });
  }
});
route.put("/res/:id", auth, async (req, res) => {
  if (process.env.apiLogs == "true") {
    console.log("[put]/api/jovouch/res/" + req.params.id);
  }
  try {
    let jovouch = await JoVouch.findOne({
      where: {
        [seq.Op.and]: [{ UserId: req.user.id }, { id: req.params.id }],
      },
    });

    jovouch.IsDeleted = false;

    jovouch.save();
    res.status(201).send({ restored: "jovouch" + req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "internal error" });
  }
});
route.delete("/permanent/:id", auth, async (req, res) => {
  if (process.env.apiLogs == "true") {
    console.log("[delete]/api/jovouch/permanent/" + req.params.id);
  }
  try {
    let jovouch = await JoVouch.findOne({
      where: {
        [seq.Op.and]: [{ UserId: req.user.id }, { id: req.params.id }],
      },
    });

    jovouch.destroy();
    res.status(201).send({ deleted: "jovouch" + req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "internal error" });
  }
});

route.put("/:id", auth, async (req, res) => {
  let v = req.body;
  let user = req.user.id;
  console.log(v);

  let Spay = v.payArr.map((e) => {
    let s = " " + e.mode + ":" + e.det + ":" + e.amt + ":" + e.det2;
    return s;
  });
  try {
    let jovouch = await JoVouch.findOne({
      where: {
        [seq.Op.and]: [{ UserId: user }, { id: req.params.id }],
      },
    });

    let NewJoVouch = {
      UserId: user,
      bill_date: v.bill_date,
      type: v.type,
      credit_acc: v.credit_acc,
      credit_acc_id: v.credit_acc_id,
      debit_acc_id: v.debit_acc_id,
      debit_acc: v.debit_acc,
      payArr: Spay,
      billArr: v.billArr,
      amount: v.amount,
      balance: v.balance,
    };

    let payAm = parseInt(NewJoVouch.amount) - parseInt(NewJoVouch.balance);

    NewJoVouch.billArr.map(async (e) => {
      let vouch = await Vouch.findOne({
        where: {
          [seq.Op.and]: [{ UserId: user }, { bill_num: e }],
        },
      });
      let a = parseInt(payAm) - parseInt(vouch.totalAmt);

      if (a >= 0) {
        vouch.status = 0;
        vouch.save();
        payAm = parseInt(payAm) - parseInt(vouch.totalAmt);
      } else if (a < 0) {
        vouch.status = a;
        vouch.save();
        payAm = 0;
      }
    });
    await jovouch.update(NewJoVouch);

    res.status(201).send(true);
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "unable to add JoVouchers" });
  }
});

route.get("/", auth, async (req, res) => {
  try {
    let JoVouchers = await JoVouch.findAll({
      where: {
        [seq.Op.and]: [{ UserId: req.user.id }, { IsDeleted: false }],
      },
    });

    let resData = JoVouchers.map((Jo) => {
      let obj = [];
      Jo.payArr.map((e) => {
        let arr = e.split(":");

        let o = {
          mode: arr[0],
          det: arr[1],
          amt: arr[2],
          det2: arr[3],
        };
        let a = JSON.stringify(o);
        obj.push(a);
      });
      Jo.payArr = obj;
      return Jo;
    });

    if (req.query.mode == "oldest") {
      resData = resData.sort(function (a, b) {
        return a.createdAt - b.createdAt;
      });
    } else if (req.query.mode == "newest") {
      resData = resData.sort(function (a, b) {
        return b.createdAt - a.createdAt;
      });
    }

    if (req.query.dir == "low") {
      resData = resData.sort(function (a, b) {
        return a.amount - b.amount;
      });
    } else if (req.query.dir == "high") {
      resData = resData.sort(function (a, b) {
        return b.amount - a.amount;
      });
    }

    res.status(200).send(resData);
  } catch (err) {
    console.error("error from jovouch " + err);
    res.status(500).send({ error: "internal Error" });
  }
});

route.get("/printedBill/:bill_num", auth, async (req, res) => {
  let arr = req.params.bill_num.split(",");
  console.log(arr + "hiiiii");
  try {
    const jo_details = await JoVouch.findOne({
      where: {
        billArr: arr.join(";"),
      },
    });
    if (arr.length > 1) {
      let details = [];
      for (let i = 0; i < arr.length; i++) {
        const jo_det = await Vouch.findOne({
          where: {
            bill_num: arr[i],
          },
        });
        if (jo_det) {
          details.push(jo_det);
        }
      }

      res.status(200).send({ jovouch: jo_details, provouch: details });
    } else {
      res.status(200).send({ jovouch: jo_details, provouch: [] });
    }
  } catch (err) {
    throw new Error(err);
    res.status(500).send({ error: "Internal Error" });
  }
});

route.get("/TotalPayment", auth, async (req, res) => {
  let date = new Date();
  let year = date.getFullYear();
  let month = parseInt(date.getMonth()) + 1;

  if (parseInt(month) < 10) {
    month = "0" + month;
  }

  let arr = [];

  let start = "1";
  let end = "3";

  while (parseInt(end) < 32) {
    if (parseInt(start) < 10) {
      start = "0" + start;
    }
    if (parseInt(end) < 10) {
      end = "0" + end;
    }

    let sdate = year + "-" + month + "-" + start;
    let edate = year + "-" + month + "-" + end;

    const Sales = await JoVouch.findAll({
      where: { [seq.Op.and]: [{ UserId: req.user.id }, { bill_date: { [seq.Op.between]: [sdate, edate] } }] },
    });

    arr.push(Sales);

    start = parseInt(start) + 3;
    end = parseInt(end) + 3;
    if (parseInt(end) == 30) {
      end = 31;
    }
  }
  res.send(arr);
});

module.exports = { route };
