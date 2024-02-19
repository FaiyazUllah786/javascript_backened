//One Way to Write it

// const asyncHandler = (fn)=>async(req,res,next)=>{
//     try {
//         await fn(req,res,next);
//     } catch (error) {
//         res.status(error.code||500).json({
//             success:false,
//             message:error.message
//         });
//     }
// }

// Another Way to Write the same Function 

const asyncHandler = (requestHandler) => {
    (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
    }
}

export { asyncHandler }

// const asyncHandler = ()=>{}
//Higher Order Function Takes Low Level Function func i(mproving writng downward)
// const asyncHandler = (func)=>{(){}}
// const asyncHandler = (func)=>(){}
// const asyncHandler = (func)=>async ()=>{}

