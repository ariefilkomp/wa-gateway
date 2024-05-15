exports.dashboard = async (req, res, next) => {
    try {
      res.send('Hello Dashboard')
    } catch (error) {
      next(error);
    }
  };